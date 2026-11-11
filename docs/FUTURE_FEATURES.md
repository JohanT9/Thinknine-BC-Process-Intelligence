# Framtida funktioner

Utvecklingsförslag som är sparade för senare. Varje förslag beskriver vad användaren ska kunna göra, varför och vad som redan finns att bygga på. Ett förslag är inte ett beslut. När det genomförs flyttas det till CHANGELOG och tas bort här.

## Egna dokumentmallar

*Sparat 2026-11-11.*

**Användaren ska kunna** skapa egna dokumentmallar och välja en mall för ett dokument eller för flera dokument på en gång. En mall kan innehålla:

- logotyp, företagsnamn, sidfot och färger
- vilka avsnitt dokumentet har, till exempel Syfte, Förutsättningar och Revisionshistorik
- standardtexter, till exempel förväntat resultat
- dokumentspråk

**Varför:** Kunder vill att dokumentationen ska se ut som deras egna dokument. De inbyggda dokumentprofilerna (Affärsprocess, SOP, Utbildningsguide, Snabbreferens och Felsökningsguide) gav nästan ingen synlig skillnad. Därför togs valet bort ur gränssnittet i 4.7.249.

**Finns att bygga på:**

- Temamotorn i `src/document/document-theme*.js` har stöd för arv och för `branding` (organisationsnamn, logotyp och sidfot), men användaren kan inte ställa in dem.
- Profilerna i `src/document/document-profile.js` finns kvar i koden. Varje dokument har kvar sin sparade profil.
- ROADMAP.md har sedan tidigare punkterna ”valbar kundlogotyp” och ”alternativa dokumentmallar” under 3.7.

**Att tänka på:**

- Mallar ska följa med vid export och synk, precis som testsviter.
- Om en mall ändras eller tas bort får befintliga dokument inte gå förlorade.
- Alla texter i gränssnittet och de genererade dokumenten måste finnas på alla registrerade språk.
