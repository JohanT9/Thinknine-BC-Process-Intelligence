# Thinknine BC Recorder v3.4.0

Version 3.4 inför ett **Context Builder-lager** före Knowledge Pack.

## Ny kedja

```text
Råhändelser
    ↓
Context Builder
    ↓
BC-tolkning
    ↓
Business Steps
    ↓
Process Pattern Engine
    ↓
Business Tasks
    ↓
Knowledge Pack 2.0
    ↓
Dokumentation
```

## Context Builder lagrar

- aktuell sida
- föregående sida
- aktuell affärsentitet
- vald post
- väntande åtgärd
- aktiv dialog
- efterföljande navigation
- destinationssida och destinationsentitet

## Exempel

När användaren väljer:

```text
Öppna posten 101002
```

kan Context Builder nu samtidigt veta:

```json
{
  "currentPageCaption": "Förs.order",
  "currentEntity": "SalesOrder",
  "followingPageCaption": "Förs.order",
  "followingEntity": "SalesOrder",
  "selectedRecordValue": "101002"
}
```

Knowledge Pack behöver därför inte gissa utifrån knapptexten ensam.

## Nya exportfiler

```text
context-events.json
context-candidates.json
```

`context-candidates.json` innehåller färdiga kandidater som OpenRecord,
ReopenDocument, ReleaseDocument, PostDocument och ChangeDate.

## Manualfilter

Följande ska inte längre visas som egna manualsteg:

- Navigate
- NavigateBack
- ConfirmYes
- ConfirmNo
