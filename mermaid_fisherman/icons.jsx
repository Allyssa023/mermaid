/* Icons — inline SVG components, stroke-based per Sentri */
const I = {};
const make = (paths, viewBox = "0 0 24 24") => ({ size = 18, className = "", style = {} } = {}) => (
  <svg width={size} height={size} viewBox={viewBox} fill="none" stroke="currentColor"
       strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"
       className={className} style={style}>
    {paths}
  </svg>
);

I.Dashboard = make(<><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></>);
I.Anchor = make(<><circle cx="12" cy="5" r="2"/><path d="M12 7v14"/><path d="M5 12a7 7 0 0 0 14 0"/><path d="M9 11h6"/></>);
I.Bell = make(<><path d="M6 8a6 6 0 0 1 12 0c0 7 3 8 3 8H3s3-1 3-8"/><path d="M10 20a2 2 0 0 0 4 0"/></>);
I.Users = make(<><circle cx="9" cy="8" r="3"/><path d="M3 20a6 6 0 0 1 12 0"/><circle cx="17" cy="6" r="2.5"/><path d="M16 13a5 5 0 0 1 5 5"/></>);
I.Clipboard = make(<><rect x="6" y="4" width="12" height="17" rx="2"/><path d="M9 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1"/><path d="M9 11h6M9 15h6"/></>);
I.Wallet = make(<><path d="M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M16 12h3"/><path d="M21 9v6"/></>);
I.Message = make(<><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8z"/></>);
I.User = make(<><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></>);
I.Fish = make(<><path d="M6 12c2-5 7-7 12-7 0 5-2 10-7 12-3 1-5-1-5-2"/><path d="M2 12s2 4 5 4"/><circle cx="15" cy="10" r="0.5" fill="currentColor"/></>);
I.Settings = make(<><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 0 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1A1.7 1.7 0 0 0 9 19.4a1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 0 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 0 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 0 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></>);
I.Search = make(<><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></>);
I.Help = make(<><circle cx="12" cy="12" r="10"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 2.5-3 4"/><circle cx="12" cy="17" r="0.5" fill="currentColor"/></>);
I.Refresh = make(<><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/><path d="M3 21v-5h5"/></>);
I.Plus = make(<><path d="M12 5v14M5 12h14"/></>);
I.Arrow = make(<><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></>);
I.ArrowUpRight = make(<><path d="M7 17 17 7"/><path d="M7 7h10v10"/></>);
I.ArrowDownRight = make(<><path d="M7 7l10 10"/><path d="M17 7v10H7"/></>);
I.Logout = make(<><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/></>);
I.Wave = make(<><path d="M3 12c2 0 3-2 4-2s1 2 3 2 3-2 4-2 1 2 3 2 3-2 4-2"/><path d="M3 17c2 0 3-2 4-2s1 2 3 2 3-2 4-2 1 2 3 2 3-2 4-2"/></>);
I.Wind = make(<><path d="M9 18.5A2.5 2.5 0 1 0 11.5 16H2"/><path d="M9.5 9.5A3 3 0 1 1 12 14H2"/><path d="M17 7a3 3 0 1 0-2.8 4H22"/></>);
I.Thermo = make(<><path d="M14 14V4a2 2 0 0 0-4 0v10a4 4 0 1 0 4 0z"/></>);
I.Drop = make(<><path d="M12 2a8 8 0 0 1 5.66 13.66L12 21l-5.66-5.34A8 8 0 0 1 12 2z"/></>);
I.Sun = make(<><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></>);
I.MapPin = make(<><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></>);
I.Compass = make(<><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></>);
I.Clock = make(<><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></>);
I.Check = make(<><path d="m5 12 5 5L20 7"/></>);
I.X = make(<><path d="M18 6 6 18M6 6l12 12"/></>);
I.Alert = make(<><path d="M10.3 3.3 1.8 17a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.3a2 2 0 0 0-3.4 0z"/><path d="M12 9v4"/><circle cx="12" cy="17" r="0.5" fill="currentColor"/></>);
I.Receipt = make(<><path d="M4 2v20l3-2 3 2 3-2 3 2 3-2 3 2V2l-3 2-3-2-3 2-3-2-3 2-3-2z"/><path d="M8 8h8M8 12h8M8 16h5"/></>);
I.Trend = make(<><path d="M22 7 13.5 15.5 8.5 10.5 2 17"/><path d="M16 7h6v6"/></>);
I.More = make(<><circle cx="5" cy="12" r="1" fill="currentColor"/><circle cx="12" cy="12" r="1" fill="currentColor"/><circle cx="19" cy="12" r="1" fill="currentColor"/></>);
I.Chart = make(<><path d="M3 3v18h18"/><path d="m7 14 4-4 4 4 5-5"/></>);
I.Eye = make(<><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></>);
I.Filter = make(<><path d="M22 3H2l8 9.5V19l4 2v-8.5L22 3z"/></>);
I.Download = make(<><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5"/><path d="M12 15V3"/></>);
I.Send = make(<><path d="m22 2-7 20-4-9-9-4 20-7z"/></>);
I.Phone = make(<><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.37 1.91.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.33 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/></>);
I.Camera = make(<><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></>);
I.Boat = make(<><path d="M3 18s2 2 5 2 4-2 7-2 5 2 5 2"/><path d="M2 14l10-4 10 4"/><path d="M12 4v6"/><path d="M5 10l-2 4M19 10l2 4"/></>);
I.Star = make(<><polygon points="12 2 15 8.5 22 9.3 17 14 18.2 21 12 17.8 5.8 21 7 14 2 9.3 9 8.5 12 2"/></>);
I.Verified = make(<><path d="m9 12 2 2 4-4"/><circle cx="12" cy="12" r="10"/></>);
I.Sidebar = make(<><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18"/></>);
I.ChevronLeft = make(<><path d="m15 18-6-6 6-6"/></>);
I.ChevronRight = make(<><path d="m9 18 6-6-6-6"/></>);
I.ChevronDown = make(<><path d="m6 9 6 6 6-6"/></>);
I.Globe = make(<><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15 15 0 0 1 0 20 15 15 0 0 1 0-20z"/></>);

window.I = I;
