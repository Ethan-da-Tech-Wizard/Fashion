const Icons = {
  get(id, size = 24, classes = '') {
    const p = this.paths[id] || this.paths['star']; // fallback
    return `<svg class="fashion-icon ${classes}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
  },

  paths: {
    /* GUI & Nav */
    'back': '<path d="M19 12H5M12 19l-7-7 7-7"/>',
    'check': '<path d="M20 6L9 17l-5-5"/>',
    'gear': '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
    'dice': '<rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><circle cx="15.5" cy="15.5" r="1.5"/><circle cx="15.5" cy="8.5" r="1.5"/><circle cx="8.5" cy="15.5" r="1.5"/><circle cx="12" cy="12" r="1.5"/>',
    'mystery': '<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
    'coin': '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><path d="M12 6v12M10 9h4M10 15h4"/>',
    'weather': '<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>',
    'closet': '<rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="12" y1="3" x2="12" y2="21"/><path d="M8 12h.01M16 12h.01"/>',
    'shopping': '<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/>',
    'edit': '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>',
    
    /* Stations & Categories */
    'dress': '<path d="M6 3h12l1 5-3 2c0 2-4 2-4 2s-4 0-4-2l-3-2 1-5z"/><path d="M5 10l-2 11h18l-2-11"/>',
    'salon': '<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><line x1="20" y1="4" x2="8.12" y2="15.88"/><line x1="14.47" y1="14.48" x2="20" y2="20"/><line x1="8.12" y1="8.12" x2="12" y2="12"/>',
    'makeup': '<path d="M7 13h10V22H7z"/><path d="M9 13V5c0-1.657 1.343-3 3-3s3 1.343 3 3v8H9z"/>',
    'tech': '<rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/>',
    'decor': '<path d="M3 13V9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4"/><path d="M2 13h20v6H2z"/><path d="M5 19v2M19 19v2"/>',
    'books': '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
    
    /* Clothing Items */
    'pants': '<path d="M6 3h12l1 18-3-1-4-8-4 8-3 1z"/>',
    'shorts': '<path d="M6 3h12l1 10-4-1-3-4-3 4-4 1z"/>',
    'shoes': '<path d="M4 14v-2a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2"/><path d="M2 18h20v2H2z"/><path d="M2 18s0-4 4-4"/><path d="M22 18s0-4-4-4"/>',
    'headband': '<path d="M4 12v-2a8 8 0 0 1 16 0v2"/><circle cx="12" cy="4" r="2"/>',
    
    /* Tools */
    'scissors': '<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><line x1="20" y1="4" x2="8.12" y2="15.88"/><line x1="14.47" y1="14.48" x2="20" y2="20"/><line x1="8.12" y1="8.12" x2="12" y2="12"/>',
    'palette': '<circle cx="13.5" cy="6.5" r=".5"/><circle cx="17.5" cy="10.5" r=".5"/><circle cx="8.5" cy="7.5" r=".5"/><circle cx="6.5" cy="12.5" r=".5"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.5 2 12 2z"/>',
    'brush': '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>',
    'star': '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
    'bucket': '<path d="M19 11v6a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-6"/><path d="M4.5 9 12 3l7.5 6M2 9h20M12 11v6"/>',
    'sparkles': '<path d="M12 3l1.912 5.813a1 1 0 0 0 .636.636L21 12l-5.813 1.912a1 1 0 0 0-.636.636L12 21l-1.912-5.813a1 1 0 0 0-.636-.636L3 12l5.813-1.912a1 1 0 0 0 .636-.636L12 3z"/>',
    'bow': '<path d="M12 12l9-7v14z"/><path d="M12 12L3 5v14z"/><circle cx="12" cy="12" r="2"/>',
    'pen': '<path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="M2 2l7.586 7.586"/><circle cx="11" cy="11" r="2"/>',
    'eraser': '<path d="M20 20H7L2 15l10-10 8 8-10 10"/><path d="M10 5l8 8"/>',
    'medal': '<circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/>',
    'bubbles': '<circle cx="8" cy="8" r="4"/><circle cx="16" cy="14" r="3"/><circle cx="9" cy="18" r="2"/><circle cx="17" cy="6" r="2"/>',
    'lashes': '<path d="M2 12c4-4.5 16-4.5 20 0"/><line x1="6" y1="8" x2="4" y2="4"/><line x1="10" y1="6" x2="9" y2="2"/><line x1="14" y1="6" x2="15" y2="2"/><line x1="18" y1="8" x2="20" y2="4"/>',
    'wand': '<path d="M2 2l12 12"/><path d="M17 5L5 17l2 2 12-12-2-2z"/><path d="M22 2l-2 2M22 6l-2-2M18 2l2 2"/>',
    'fabric': '<path d="M6 3h12v18H6z"/><line x1="6" y1="7" x2="18" y2="7"/><line x1="6" y1="17" x2="18" y2="17"/>',
    'square': '<rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>',
    'spray': '<path d="M3 13V9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4"/><path d="M2 13h20v6H2z"/><path d="M5 19v2M19 19v2"/>', // spray needs better icon, maybe same as brush?
    'face': '<circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/>'
  },
  
  init() {
    document.querySelectorAll('[data-icon]').forEach(el => {
      const id = el.getAttribute('data-icon');
      const cc = el.getAttribute('data-icon-class') || '';
      el.innerHTML = this.get(id, 24, cc);
    });
  }
};
