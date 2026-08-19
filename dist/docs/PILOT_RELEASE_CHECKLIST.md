# Pilot release go/no-go checklist

Do not pre-check an item without actual evidence.

- [ ] Clean Git source
- [ ] Release version set and synchronized
- [ ] Full CI green
- [ ] Production build green
- [ ] Production package independently validated
- [ ] Release manifest contains full Git commit and checksums
- [ ] No secrets, customer data, debug dumps, or source maps in ZIP
- [ ] Standard BC recording manually verified
- [ ] Review editing manually verified
- [ ] Document Workspace manually verified
- [ ] Word export manually verified
- [ ] Compatibility fixture passes
- [ ] Real same-ID browser upgrade and state preservation verified
- [ ] Active-recording interruption behavior manually exercised
- [ ] React/control-add-in real pilot surface status documented
- [ ] Store metadata and sanitized assets reviewed
- [ ] Privacy and permission text approved by a human
- [ ] Support/privacy/product URLs supplied
- [ ] Pilot installation guide reviewed by a consultant
- [ ] Rollback/recovery owner and procedure known
- [ ] Distribution visibility and tester assignment approved

## Severity policy

- **BLOCKER:** recording lost/corrupted, extension cannot start, update loses
  existing data, Word export fails, or normal BC capture is broken.
- **MAJOR:** meaningful process step is missing, a critical screenshot is wrong,
  or a required React/control-add-in view is unsupported.
- **MINOR:** wording refinement or cosmetic layout issue without semantic loss.

Any BLOCKER is no-go. A MAJOR is no-go when it affects the agreed pilot process;
otherwise it requires an explicit documented scope decision. MINOR issues may
be accepted with ownership and follow-up.
