// icons.js — Unique responsabilité : fournir les icônes SVG inline utilisées dans l'app.
// Centralisées ici pour éviter de dupliquer du markup SVG dans chaque vue.

export const iconeEtoile = (couleur = "var(--gold)") =>
  `<svg width="16" height="16" viewBox="0 0 24 24" fill="${couleur}"><path d="M12 2L14.7 8.5L21.8 9.1L16.4 13.7L18 20.7L12 17L6 20.7L7.6 13.7L2.2 9.1L9.3 8.5L12 2Z"/></svg>`;

export const iconeMenuPoints = () =>
  `<svg width="20" height="20" viewBox="0 0 24 24" fill="var(--accent)"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>`;

export const iconeMaitrise = (couleur = "var(--accent)") =>
  `<svg width="17" height="17" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="${couleur}" stroke-width="1.8"/><path d="M8 12.5L10.5 15L16 9" stroke="${couleur}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

export const iconeARevoir = () =>
  `<svg width="17" height="17" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="var(--status-a-revoir-icon)" stroke-width="1.8"/><path d="M12 7V12L15.5 14" stroke="var(--status-a-revoir-icon)" stroke-width="1.8" stroke-linecap="round"/></svg>`;

export const iconeHautParleur = () =>
  `<svg width="17" height="17" viewBox="0 0 24 24" fill="var(--accent)"><path d="M4 9V15H8L13 19V5L8 9H4Z"/><path d="M16.5 8.5C17.5 9.5 18 10.7 18 12C18 13.3 17.5 14.5 16.5 15.5" stroke="var(--accent)" stroke-width="1.8" stroke-linecap="round" fill="none"/></svg>`;

export const iconePlus = () =>
  `<svg width="26" height="26" viewBox="0 0 24 24" fill="none"><path d="M12 5V19M5 12H19" stroke="#FFFFFF" stroke-width="2.4" stroke-linecap="round"/></svg>`;

export const iconeCrayon = (couleur = "#FFFFFF") =>
  `<svg width="19" height="19" viewBox="0 0 24 24" fill="none"><path d="M4 20L4.8 16.5L15.5 5.8C16 5.3 16.8 5.3 17.3 5.8L18.7 7.2C19.2 7.7 19.2 8.5 18.7 9L8 19.7L4 20Z" stroke="${couleur}" stroke-width="1.8" stroke-linejoin="round"/></svg>`;

export const iconePoubelle = (couleur = "#FFFFFF") =>
  `<svg width="19" height="19" viewBox="0 0 24 24" fill="none"><path d="M5 7H19" stroke="${couleur}" stroke-width="1.8" stroke-linecap="round"/><path d="M9 7V5C9 4.45 9.45 4 10 4H14C14.55 4 15 4.45 15 5V7" stroke="${couleur}" stroke-width="1.8"/><path d="M7 7L7.6 19C7.65 19.55 8.1 20 8.65 20H15.35C15.9 20 16.35 19.55 16.4 19L17 7" stroke="${couleur}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

export const iconeLoupe = () =>
  `<svg width="17" height="17" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke="var(--text-muted)" stroke-width="2"/><path d="M20 20L16.5 16.5" stroke="var(--text-muted)" stroke-width="2" stroke-linecap="round"/></svg>`;

export const iconeCalendrierTri = () =>
  `<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="4" y="5" width="16" height="15" rx="2.5" stroke="var(--accent)" stroke-width="1.8"/><path d="M4 9.5H20" stroke="var(--accent)" stroke-width="1.8"/><path d="M8 3V6" stroke="var(--accent)" stroke-width="1.8" stroke-linecap="round"/><path d="M16 3V6" stroke="var(--accent)" stroke-width="1.8" stroke-linecap="round"/></svg>`;

export const iconeAZTri = () =>
  `<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M4 14L7 6L10 14M5 11H9" stroke="var(--accent)" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M14 7H20L14 17H20" stroke="var(--accent)" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

export const iconeCadenas = () =>
  `<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><rect x="5" y="11" width="14" height="9" rx="2" stroke="#FFFFFF" stroke-width="1.8"/><path d="M8 11V8C8 5.8 9.8 4 12 4C14.2 4 16 5.8 16 8V11" stroke="#FFFFFF" stroke-width="1.8"/></svg>`;

export const iconeCoche = () =>
  `<svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M4 12L9 17L20 6" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

export const iconeMaison = (actif) =>
  `<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M4 10.5L12 4L20 10.5V19C20 19.55 19.55 20 19 20H15V14H9V20H5C4.45 20 4 19.55 4 19V10.5Z" ${actif ? 'fill="var(--accent)"' : 'stroke="var(--icon-inactive)" stroke-width="1.8" stroke-linejoin="round"'}/></svg>`;

export const iconeLivre = (actif) =>
  `<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M4 5.5C4 4.67 4.67 4 5.5 4H11V19H5.5C4.67 19 4 18.33 4 17.5V5.5Z" ${actif ? 'fill="var(--accent)"' : 'stroke="var(--icon-inactive)" stroke-width="1.8" stroke-linejoin="round"'}/><path d="M20 5.5C20 4.67 19.33 4 18.5 4H13V19H18.5C19.33 19 20 18.33 20 17.5V5.5Z" ${actif ? 'fill="var(--accent)"' : 'stroke="var(--icon-inactive)" stroke-width="1.8" stroke-linejoin="round"'}/></svg>`;

export const iconeAlbum = (actif) =>
  `<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><rect x="4" y="6" width="14" height="14" rx="3" stroke="${actif ? "var(--accent)" : "var(--icon-inactive)"}" stroke-width="${actif ? 2.1 : 1.8}"/><circle cx="9" cy="11" r="1.6" stroke="${actif ? "var(--accent)" : "var(--icon-inactive)"}" stroke-width="1.6"/><path d="M5 17L9.5 13L12.5 15.5L16 12L18 14" stroke="${actif ? "var(--accent)" : "var(--icon-inactive)"}" stroke-width="${actif ? 2.1 : 1.8}" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

export const iconeFlamme = () =>
  `<svg width="24" height="24" viewBox="0 0 24 24" fill="#FFFFFF"><path d="M12 2C12 2 7 7 7 12.5C7 16 9.5 18.5 12 18.5C14.5 18.5 17 16 17 12.5C17 11 16.3 9.7 15.5 8.7C15.5 10 14.7 11 13.5 11C14 9 13 6.5 12 2Z"/></svg>`;

export const iconeDe = (couleur = "var(--accent)") =>
  `<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><rect x="4" y="4" width="16" height="16" rx="4" stroke="${couleur}" stroke-width="2"/><circle cx="9" cy="9" r="1.4" fill="${couleur}"/><circle cx="15" cy="9" r="1.4" fill="${couleur}"/><circle cx="12" cy="12" r="1.4" fill="${couleur}"/><circle cx="9" cy="15" r="1.4" fill="${couleur}"/><circle cx="15" cy="15" r="1.4" fill="${couleur}"/></svg>`;

export const iconePatte = (couleur = "#E8A79F") =>
  `<svg width="60%" height="60%" viewBox="0 0 24 24" fill="${couleur}"><ellipse cx="12" cy="16" rx="5.5" ry="4.5"/><ellipse cx="5.5" cy="10" rx="2.3" ry="3"/><ellipse cx="18.5" cy="10" rx="2.3" ry="3"/><ellipse cx="8.5" cy="5.5" rx="2" ry="2.6"/><ellipse cx="15.5" cy="5.5" rx="2" ry="2.6"/></svg>`;

export const iconeImagePlaceholder = () =>
  `<svg width="40%" height="40%" viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="14" rx="2" stroke="#E8A79F" stroke-width="1.8"/><circle cx="9" cy="10" r="1.6" stroke="#E8A79F" stroke-width="1.6"/><path d="M4 16L9 11.5L12.5 14.5L16 11L20 15" stroke="#E8A79F" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

export const iconeTelecharger = () =>
  `<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 4V14M12 14L8 10M12 14L16 10" stroke="var(--accent)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M5 16V18C5 19.1 5.9 20 7 20H17C18.1 20 19 19.1 19 18V16" stroke="var(--accent)" stroke-width="1.8" stroke-linecap="round"/></svg>`;

export const iconeImporter = () =>
  `<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 14V4M12 4L8 8M12 4L16 8" stroke="var(--accent)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M5 16V18C5 19.1 5.9 20 7 20H17C18.1 20 19 19.1 19 18V16" stroke="var(--accent)" stroke-width="1.8" stroke-linecap="round"/></svg>`;

export const iconeListe = () =>
  `<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="5" y="4" width="14" height="16" rx="2" stroke="var(--accent)" stroke-width="1.8"/><path d="M8 9H16M8 13H16M8 17H12" stroke="var(--accent)" stroke-width="1.8" stroke-linecap="round"/></svg>`;

export const iconeAlerteTriangle = () =>
  `<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 4L21 19H3L12 4Z" stroke="#FFFFFF" stroke-width="1.8" stroke-linejoin="round"/><path d="M12 10V13.5" stroke="#FFFFFF" stroke-width="1.8" stroke-linecap="round"/><circle cx="12" cy="16" r="1" fill="#FFFFFF"/></svg>`;

export const iconeEtoileContour = () =>
  `<svg width="17" height="17" viewBox="0 0 24 24" fill="none"><path d="M12 3L14.2 8.2L20 8.7L15.6 12.4L17 18L12 14.9L7 18L8.4 12.4L4 8.7L9.8 8.2L12 3Z" stroke="var(--danger)" stroke-width="1.6" stroke-linejoin="round"/></svg>`;

export const iconeCroix = (couleur = "var(--text-muted)") =>
  `<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M6 6L18 18M18 6L6 18" stroke="${couleur}" stroke-width="2.2" stroke-linecap="round"/></svg>`;
