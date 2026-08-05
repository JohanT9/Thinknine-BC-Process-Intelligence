# v4.5.0 UX3 — Connected Workspaces

Review Workspace och Document Workspace känns nu som två perspektiv av samma
dokument. Ett markerat steg, en skärmbild eller en annotering följer med när
perspektivet byts, utan att användaren behöver leta upp samma plats igen.

Dokumentets avsnitt, steg, instruktioner, skärmbilder och kommentarer kan
aktiveras med mus, Enter eller blanksteg för att öppna rätt Review-steg.
Synkronisering visas med en diskret tillfällig markering och tydliga
skärmläsarmeddelanden. Reducerad motion respekteras.

Den nya immutable Workspace Context-modulen är ensam källa för gemensam
navigationsposition. Arbetsytorna kommunicerar aldrig direkt, och synkronisering
ändrar inte dokumentsemantik, planering, komponenter eller Word-export.
